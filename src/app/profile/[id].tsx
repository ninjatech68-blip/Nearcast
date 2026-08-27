import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { broadcaster, featuredIntent } from '@/features/native-demo/nearcast-fixtures';
import {
  ActionTray,
  DividerHairline,
  Group,
  IntentRow,
  ProfileBlock,
  Section,
  StatusBanner,
  SymbolIcon,
  TopBar,
} from '@/features/native-demo/native-ui';

export default function BroadcasterProfileScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <TopBar title="Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Group>
          <ProfileBlock {...broadcaster} />
        </Group>

        <Section title="Current intent">
          <View style={styles.intentList}>
            <IntentRow
              title={featuredIntent.title}
              meta={`${featuredIntent.area} · ${featuredIntent.expiry}`}
              onPress={() => router.push(`/intent/${featuredIntent.id}`)}
            />
          </View>
        </Section>

        <Section title="Trust context">
          <Group padded>
            <View style={styles.textRow}>
              <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="🛡" name="checkmark.shield" size={18} />
              <Text style={styles.body}>Aarav is one connection away from your network.</Text>
            </View>
            <DividerHairline />
            <View style={styles.textRow}>
              <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="👥" name="person.2.slash" size={18} />
              <Text style={styles.body}>Origin circle stays private.</Text>
            </View>
          </Group>
        </Section>

        <Section>
          <StatusBanner
            tone="info"
            title="Hidden until accepted"
            body="Exact place and contact details appear only after mutual acceptance."
            icon="lock"
            fallback="🔒"
          />
        </Section>
      </ScrollView>
      <ActionTray
        primaryLabel="Request to join"
        secondaryLabel="Not relevant"
        leadingIcon={<SymbolIcon color="#FFFFFF" fallback="+" name="plus.circle" size={16} />}
        onPrimary={() => router.push(`/request/${featuredIntent.id}`)}
        onSecondary={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingBottom: 26 },
  intentList: { paddingHorizontal: 2 },
  textRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  body: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textPrimary },
});
