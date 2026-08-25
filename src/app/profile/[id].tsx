import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/design-system/appearance';
import { type ColorScheme } from '@/design-system/tokens';
import { broadcaster, featuredIntent } from '@/features/native-demo/nearcast-fixtures';
import { ActionTray, Group, MiniIntentRow, ProfileBlock, Section, TopBar } from '@/features/native-demo/native-ui';

export default function BroadcasterProfileScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar title="Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Group>
          <ProfileBlock {...broadcaster} />
        </Group>

        <Section title="Current intent">
          <Group>
            <MiniIntentRow metadata={featuredIntent.metadata} status={featuredIntent.status} title={featuredIntent.title} />
          </Group>
        </Section>

        <Section title="Trust context">
          <Group>
            <View style={styles.textBlock}>
              <Text style={styles.body}>Aarav is one connection away from your network.</Text>
              <Text style={styles.muted}>Origin circle stays private.</Text>
            </View>
          </Group>
        </Section>

        <Section>
          <Group>
            <View style={styles.hiddenBlock}>
              <Text style={styles.hiddenTitle}>Hidden until accepted</Text>
              <Text style={styles.muted}>Exact place and contact details</Text>
            </View>
          </Group>
        </Section>
      </ScrollView>
      <ActionTray primaryLabel="Request to join" secondaryLabel="Not relevant" onPrimary={() => router.push('/request/badminton-tonight')} />
    </SafeAreaView>
  );
}

const createStyles = (color: ColorScheme) =>
  StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background.app },
  content: { paddingHorizontal: 20, paddingBottom: 26 },
  textBlock: { padding: 16 },
  body: { fontWeight: '400', fontSize: 15, lineHeight: 22, color: color.text.primary },
  muted: { marginTop: 3, fontWeight: '400', fontSize: 14, lineHeight: 20, color: color.text.secondary },
  hiddenBlock: { padding: 16 },
  hiddenTitle: { fontWeight: '600', fontSize: 16, lineHeight: 22, color: color.text.primary },
});
