import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.light.background.app },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  profileRow: { flexDirection: 'row', gap: 16, padding: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.light.background.success },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 24, color: tokens.color.light.on.success },
  copy: { flex: 1 },
  name: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 28, color: tokens.color.light.text.primary },
  meta: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.color.light.text.secondary },
});
