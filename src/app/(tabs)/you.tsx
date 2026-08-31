import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { Group, IconLine, ScreenTitle, Section } from '@/features/native-demo/native-ui';

export default function YouScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>You</ScreenTitle>

        <Section>
          <Group>
            <View style={styles.profileRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>PS</Text></View>
              <View style={styles.copy}>
                <Text style={styles.name}>Your profile</Text>
                <Text style={styles.meta}>Private alpha</Text>
                <IconLine fallback="P" icon="lock" text="Privacy controls and preferences will appear here as account setup is built." />
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Trust">
          <Group>
            <View style={styles.trustRow}>
              <Text style={styles.trustTitle}>No circles yet</Text>
              <Text style={styles.trustBody}>Join a few casts and people you meet can vouch for you.</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.trustRow}>
              <Text style={styles.trustTitle}>Signal building</Text>
              <Text style={styles.trustBody}>Signal grows as casts you join or host actually happen.</Text>
            </View>
          </Group>
        </Section>

        <Section title="Settings">
          <Group>
            <Pressable
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
              onPress={() => router.push('/profile/edit')}
              style={styles.settingsRow}>
              <Text style={styles.trustTitle}>Edit profile</Text>
              <Text style={styles.trustBody}>Name, area, interests, privacy, and account.</Text>
            </Pressable>
          </Group>
        </Section>

        <Section title="Receipts">
          <Group>
            <View style={styles.trustRow}>
              <Text style={styles.trustTitle}>Your receipts</Text>
              <Text style={styles.trustBody}>A record of casts that actually happened.</Text>
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
  profileRow: { flexDirection: 'row', gap: 16, padding: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 24, color: tokens.semantic.color.trustText },
  copy: { flex: 1 },
  name: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28, color: tokens.semantic.color.textPrimary },
  meta: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textMuted },
  trustRow: { padding: 16 },
  settingsRow: { minHeight: 56, justifyContent: 'center', padding: 16 },
  trustTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  trustBody: { marginTop: 4, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  divider: { height: 1, marginHorizontal: 16, backgroundColor: tokens.semantic.color.borderDefault },
});
